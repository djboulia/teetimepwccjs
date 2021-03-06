var cheerio = require('cheerio');

var parseJsonAttribute = function ($, el, day, contimes) {
    let obj = undefined;
    const json = $(el).children('a').attr('data-ftjson');
    // console.log("data-ftjson: " + json);

    try {
        obj = (json) ? JSON.parse(json) : undefined;
        // console.log("after: " + JSON.stringify(teetime.json));

        if (obj) {
            obj.day = day;
            obj.contimes = contimes;
        }
    } catch (e) {
        console.log("error parsing JSON: " + json);
    }

    return obj;
}

var getPlayers = function ($, el) {

    let players = [];

    if ($(el).children().length > 0) {
        const divs = $(el).children('div');

        if (divs.each != undefined) {

            divs.each(function (i, div) {
                if (!$(div).hasClass('slotCount')) {
                    const spans = $('span', div);
                    if (spans.length > 0) {
                        players.push($(spans).eq(0).text());
                    } else {
                        console.log("Warning! No name information found for this player slot! ");
                        players.push("Error");
                    }
                }
            });

            // process any unfilled positions
            if (players.length <= 4) {
                for (let i = players.length; i < 4; i++) {
                    players.push("Available");
                }
            } else {
                console.log("Warning! got more than 4 players in tee time! " + JSON.stringify(players));
            }

        }
    } else {
        // no player div information means the tee time was 
        // blocked by pro shop - no slots available
        players = ["Blocked", "Blocked", "Blocked", "Blocked"];
    }

    return players;
};

/**
 * We need to send the day of the week (e.g. Monday, Tuesday)
 * as part of a subsequent reservation request, so we 
 * capture it from the appropriate field in the tee sheet
 * 
 * @param {Object} $ cheerio object to doc
 */
var getDayOfWeek = function ($) {
    const dateSelect = $('div .rwdDateSelect');
    return $('span', dateSelect).text();
}

/**
 * the tee sheet data has a field called data-ftdefaultConTimes
 * this property gets sent later during a reservation, so 
 * we capture it here.
 * cheerio treats any attributes that starts with data-
 * as data attributes.  We get the data attributes as a
 * JSON object and then read the ftdefaultcontimes (translated
 * to lower case, no idea why) property.
 * 
 * @param {Object} $ cheerio object to doc
 */
var getConTimes = function ($) {
    const table = $('div .member_sheet_table');
    console.log("conTimes: " + JSON.stringify(table.data()));
    return table.data().ftdefaultcontimes.toString();
}

var TeeSheet = function (body) {
    this.getTeeTimes = function () {
        const $ = cheerio.load(body);
        // console.log("body: " + body);

        const day = getDayOfWeek($);
        const contimes = getConTimes($);

        const teetimes = [];

        // each table row represents a course tee time
        $('div .rwdTr').each(function (i, tr) {
            if ($(this).hasClass('hasRowColor')) {
                blocked = true;
            }

            // look through the columns to extract the tee 
            // time information
            var td = $('div .rwdTd', tr);
            if (td.each != undefined && td.length > 0) {

                const teetime = {};

                td.each(function (i, el) {
                    if ($(el).hasClass('sT')) {
                        // actual tee time
                        teetime.time = $(el).text();

                        // for tee times with available slots, there is an
                        // attribute with json information.  save that here
                        teetime.json = parseJsonAttribute($, el, day, contimes);

                    } else if ($(el).hasClass('sN')) {
                        // course name
                        teetime.course = $(el).text();
                    } else if ($(el).hasClass('sP')) {
                        // players
                        teetime.players = getPlayers($, el);
                    }
                });

                if (!teetime.time) {
                    console.log("Found empty tee time, not adding it " + $(tr).html());
                } else {
                    // console.log("adding tee time ", teetime);
                    teetimes.push(teetime);
                }

            }

        });

        return teetimes;
    }
}


module.exports = TeeSheet;