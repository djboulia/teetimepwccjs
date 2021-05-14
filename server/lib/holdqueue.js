
var moment = require('moment-timezone');
/**
 * implement a FIFO queue for managing held tee times
 */

/**
 * 
 * @returns a Date string of the JSON held time and date
 */
var getJsonDateString = function (json) {
    const timeString = json['time:0'];
    const dateString = json['date'];

    const etzMoment = moment.tz(timeString + ' ' + dateString, "hh:mm a YYYYMMDD", 'America/New_York');

    // console.log(etzMoment.clone().tz('America/New_York').format('hh:mm a MM-DD-YYYY z'));
    return etzMoment.clone().tz('America/New_York').format('hh:mm a MM-DD-YYYY z');
}

/**
 * 
 * @returns a Date object of the JSON held time and date
 */
 var getJsonDate = function (json) {
    const teeTime = new Date(getJsonDateString(json));
    return teeTime;
}

var HoldQueue = function () {
    const queue = [];

    this.isEmpty = function () {
        return queue.length === 0;
    }

    this.remove = function () {
        if (this.isEmpty()) {
            return null;
        } else {
            return queue.shift();
        }
    };

    this.add = function (session, json, slot) {
        queue.push({
            session: session,
            json: json,
            slot: slot
        });

        // hold times could come in out of order, so we sort
        // such that closest time to our request is at the top of the queue
        queue.sort(function (a, b) {
            const aTime = getJsonDate(a.json).getTime();
            const bTime = getJsonDate(b.json).getTime();

            if (aTime > bTime) {
                return 1;
            } else if (bTime > aTime) {
                return -1;
            } else {
                return 0;
            }
        });

        // print the order so we can see it
        console.log('hold queue: ' + this.toString());
    };

    this.toString = function () {
        let result = 'length: ' + queue.length + '\n';

        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            const slot = item.slot;
            const json = item.json;

            result += 'item ' + i + ': date: ' + getJsonDateString(json) + ', course: ' + slot.getCourse() + '\n';
        }

        return result;
    };
};

module.exports = HoldQueue;