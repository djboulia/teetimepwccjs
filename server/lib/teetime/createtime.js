var moment = require('moment-timezone');

var validDate = function (dateString) {
    const dateParts = dateString.split('/');

    if (dateParts.length != 3) {
        return false;
    }

    const month = parseInt(dateParts[0]);
    if (month < 1 || month > 12) {
        return false;
    }

    const day = parseInt(dateParts[1]);
    if (day < 1 || day > 31) {
        return false;
    }

    const year = parseInt(dateParts[2]);
    if (year < 2000) {
        return false;
    }

    return true;
}

var CreateTime = function (dateString, timeString) {
    // construct a Date object from the date and tee time given
    // we expect time to be in the format hh:mm a, where a is AM or PM
    if (!validDate(dateString)) {
        return null;
    }

    // all tee times come in as an Eastern time zone.  use moment-timezone
    // to parse the time appropriately regardless of the timezone of the
    // environment we're running in
    const etzMoment = moment.tz(timeString + ' ' + dateString, "hh:mm a MM/DD/YYYY", 'America/New_York');

    // console.log(etzMoment.clone().tz('America/New_York').format('hh:mm z'));
    const teeTime = new Date(etzMoment.clone().format());
    return teeTime;
};

module.exports = CreateTime;
