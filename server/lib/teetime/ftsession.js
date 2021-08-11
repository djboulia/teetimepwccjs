var cheerio = require('cheerio');
var Header = require('../web/header.js');
var Session = require('../web/session.js');
var FormData = require('../web/formdata');
var TeeTimeCurrentTime = require('../actions/teetimecurrenttime.js');
var TeeTimeSearch = require('../actions/teetimesearch.js');


const API_TEEITME_BASE = "/v5/prestonwoodccnc_flxrez0_m30";
const API_TEETIME_CURRENT_TIME = API_TEEITME_BASE + '/clock';
const API_TEETIME_MEMBER_SEARCH = API_TEEITME_BASE + '/data_loader';
const API_TEETIME_SEARCH = API_TEEITME_BASE + '/Member_sheet';
const API_TEETIME_RESERVE = API_TEEITME_BASE + '/Member_slot';


const CAPTCHA_IMG_PATH = './images';

/**
 * Encapsulate the ForeTees interactions in this one module.
 * 
 * @param {*} sitename 
 */
var FTSession = function (sitename) {
    const session = new Session(sitename);
    const PATH_WEBAPI = 'v5/prestonwoodccnc_flxrez0_m30/Common_webapi';
    const sessionData = {
        ftKeys: null,
        uuid: null
    }

    // the tee time site seems to trigger off the User-Agent being set to a valid browser
    // type.  we set it to Firefox here.
    session.addHeader(Header.UserAgent.FIREFOX);

    this.login = function (ftKeys) {
        return new Promise(function (resolve, reject) {

            console.log('in login promise');

            const jQueryString = 'jQuery33107422705968864874_' + Date.now();

            const queryString = new FormData();
            queryString.add('callback', jQueryString);
            queryString.add('uid', ftKeys.ftSSOKey);
            queryString.add('type', 'sso');
            queryString.add('iv', ftKeys.ftSSOIV);
            queryString.add('_', Date.now());

            const queryPath = PATH_WEBAPI + '?sso&' + queryString.toQueryString();
            // console.log('would call: ' + sitename + '/' + queryPath);

            session.get(queryPath)
                .then(function (body) {

                    const json = body.slice(jQueryString.length + 1, body.length - 2);
                    console.log('found: ' + json);

                    const result = JSON.parse(json);
                    console.log('result ', result);

                    if (result.foreTeesSSOResp && result.foreTeesSSOResp.sessionUuid) {
                        const resp = result.foreTeesSSOResp;
                        sessionData.ftKeys = ftKeys;
                        sessionData.uuid = resp.sessionUuid;

                        resolve(sessionData);
                    } else {
                        reject(result);
                    }
                });
        });
    };

    this.currentTime = function () {
        const teeTimeCurrentTime = new TeeTimeCurrentTime(API_TEETIME_CURRENT_TIME, session);
        return teeTimeCurrentTime.promise();
    };

    this.memberSearch = function (lastname) {
        const path = API_TEETIME_MEMBER_SEARCH + "?name_search=" + lastname + "&limit=100&arr=&_=" + Date.now();
        return session.get(path);
    };

    this.search = function (timeString, dateString, courses) {
        const teeTimeSearch = new TeeTimeSearch(API_TEETIME_SEARCH, session, CAPTCHA_IMG_PATH);
        return teeTimeSearch.promise(timeString, dateString, courses);
    };

    /**
     * There are three steps in the tee time booking process
     * 1. initiateReservation - POST method (HTML) which attempts to hold the tee time
     * 2. callbackReservation - If the hold is successful, a second POST (JSON) 
     *    callback is made to get the tee time info required to commit the booking
     * 3. commitReservation - a POST (JSON) call to commit the booking -OR- 
     *    cancelReservation - a GET (JSON) call to release the hold on the tee time
     */
    
    /**
     * this is where we attempt to hold the time slot.  there are a 
     * few possible outcomes:
     *  1. we get the lock 
     *  2. we can't get the lock, but are given an alternative
     *  3. we can't get the lock, probably due to someone else getting it
     */
    this.holdReservation = function (json) {
        const path = API_TEETIME_RESERVE;

        return new Promise(function (resolve, reject) {
            // load up our form data.  Most of this comes 
            // from the tee sheet
            const formdata = new FormData();

            formdata.add("lstate", json.lstate);
            formdata.add("newreq", json.newreq);
            formdata.add("displayOpt", json.displayOpt);
            formdata.add("ttdata", json.ttdata);
            formdata.add("date", json.date);
            formdata.add("index", json.index);
            formdata.add("course", json.course);
            formdata.add("returnCourse", json.returnCourse);
            formdata.add("jump", json.jump);
            formdata.add("wasP1", json.wasP1);
            formdata.add("wasP2", json.wasP2);
            formdata.add("wasP3", json.wasP3);
            formdata.add("wasP4", json.wasP4);
            formdata.add("wasP5", json.wasP5);
            formdata.add("p5", json.p5);
            formdata.add("time:0", json['time:0']);
            formdata.add("day", json.day);
            formdata.add("contimes", json.contimes);

            session.post(path, formdata.toObject())
                .then(function (body) {

                    // pick out the values we need for the next step
                    const $ = cheerio.load(body);
                    const table = $('div .slot_container');
                    const data = table.data();
                    const result = (data) ? data.ftjson : undefined;

                    if (result && result.callback_map) {
                        const callback_map = result.callback_map;
                        console.log("initiateReservation: callback_map " + JSON.stringify(callback_map));

                        const page_start_notifications = result.page_start_notifications;
                        console.log("initiateReservation: page_start_notifications: " + JSON.stringify(page_start_notifications));

                        if (!callback_map['time:0']) {
                            console.log("initiateReservation: no tee time found in response, added " + json['time:0']);
                            callback_map['time:0'] = json.time;
                            reject("initiateReservation: rejecting alternate tee time");
                        } else {
                            console.log("initiateReservation: found tee time in response: " + callback_map['time:0']);
                            resolve(callback_map);
                        }
                    } else {
                        reject("invalid json: " + JSON.stringify(json));
                    }
                }, function (err) {
                    reject(err);
                });
        });
    };

    /**
     * initiateReservation will return the data for booking a reservation
     * we hand those parameters back to the callback via a web form
     * this internal function loads up the right data for the next step, 
     * i.e. commit the reservation or canceling (releasing the hold) on the tee time
     */
    var callbackReservation = function (players, json) {
        const path = API_TEETIME_RESERVE;

        return new Promise(function (resolve, reject) {

            // load up the form data from the json fields
            const formdata = new FormData();

            for (var key in json) {
                if (json.hasOwnProperty(key)) {
                    formdata.add(key, json[key]);
                }
            }

            session.post(path, formdata.toObject(), Header.XmlHttpRequest)
                .then(function (body) {

                    // process the results and form into an object for
                    // the next call
                    const result = JSON.parse(body);

                    if (result && result.id_list && result.id_hash) {
                        const id_list = result.id_list;
                        const id_hash = result.id_hash;

                        console.log("id_list: " + JSON.stringify(id_list));
                        console.log("id_hash: " + JSON.stringify(id_hash));

                        const obj = {};

                        obj['teecurr_id1'] = id_list[0];
                        obj.id_hash = id_hash;
                        obj.hide = "0";
                        obj.notes = "";

                        for (let i = 1; i <= 5; i++) {
                            if (i > players.length) {
                                obj["player" + i] = "";
                                obj["user" + i] = "";
                                obj["p9" + i] = "0";
                                obj["p" + i + "cw"] = "";
                                obj["guest_id" + i] = "0";
                            } else {
                                const player = players[i - 1];

                                obj["player" + i] = player.name;
                                obj["user" + i] = player.username;
                                obj["p9" + i] = "0";
                                // [djb 3/19/2021] use CRT instead of PV for those with no private vehicle
                                obj["p" + i + "cw"] = "CRT";
                                obj["guest_id" + i] = "0";
                            }
                        }

                        obj.json_mode = "true";

                        console.log("returning obj : " + JSON.stringify(obj));

                        resolve(obj);
                    } else {
                        reject("callbackReservation: Invalid json");
                    }

                }, function (err) {
                    reject(err);
                });
        })
    };

    /**
     * complete the booking
     * 
     * @param {Object} players foursome of players in this booking
     * @param {Object} json json data for this tee time
     * @returns 
     */
    this.commitReservation = function (players, json) {
        const path = API_TEETIME_RESERVE;

        return new Promise(function (resolve, reject) {

            callbackReservation(players, json)
                .then(function (result) {

                    // load up the form data from the json fields
                    const formdata = new FormData();

                    for (var key in result) {
                        if (result.hasOwnProperty(key)) {
                            formdata.add(key, result[key]);
                        }
                    }

                    // add the commit action form data
                    formdata.add('submitForm', 'submit');
                    formdata.add('slot_submit_action', 'update');

                    session.post(path, formdata.toObject(), Header.XmlHttpRequest)
                        .then(function (body) {
                            console.log("result " + body);
                            const result = JSON.parse(body);
                            if (result && result.successful) {
                                resolve(result);
                            } else {
                                console.log("commitReservation: didn't get a positive confirmation");
                                reject(result);
                            }

                        }, function (err) {
                            reject(err);
                        });
                })
                .catch((err) => {
                    reject(err);
                });
        });

    };

    /**
     * release the hold on this booking
     * 
     * @param {Object} players foursome of players in this booking
     * @param {Object} json json data for this tee time
     * @returns 
     */
     this.releaseReservation = function (players, json) {
        return new Promise(function (resolve, reject) {

            callbackReservation(players, json)
                .then(function (result) {
                    console.log('releasing hold on tee time: ' + result['teecurr_id1']);

                    // load up the form data from the json fields
                    const formdata = new FormData();

                    for (var key in result) {
                        if (result.hasOwnProperty(key)) {
                            formdata.add(key, result[key]);
                        }
                    }

                    // add the cancel action form data
                    formdata.add('cancel', 'cancel');
                    formdata.add('_', Date.now());

                    const path = API_TEETIME_RESERVE + '?' + formdata.toQueryString();
                    console.log('cancel path:' + path);

                    session.get(path)
                        .then(function (body) {
                            if (body.includes('the time slot has been returned to the system without changes')) {
                                console.log('successfully released ' + result['teecurr_id1']);
                                resolve(true);
                            } else {
                                const response = session.getLastResponse();
                                const err = "unexpected cancel result " + response.statusCode;
                                console.log(err);
                                console.log("body " + body);

                                reject(err);
                            }
                        }, function (err) {
                            reject(err);
                        });
                })
                .catch((err) => {
                    reject(err);
                });

        });
    }

};

module.exports = FTSession;
