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

var formatTime = function (timeString) {
  // tee times come in as HH:MM:SS
  // chop off the :SS
  const timeParts = timeString.split(':');

  if (timeParts.length != 3) {
    console.log("createTeeTime: invalid time format!")
    return null;
  }

  return timeParts[0] + ':' + timeParts[1];
}

var TeeTimeSearch = function (path) {

  this.getPath = function (date) {
    const month = date.getMonth() +1;
    const day = date.getDate();

    path += date.getFullYear();
    path += (month < 10) ? '0' + month : month;
    path += (day < 10) ? '0' + day : day;

    path += '/118;119;120/0/null/false';

    return path;
  };

  this.createTime = function (dateString, timeString) {
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

  this.create24HourTime = function (dateString, time) {
    // construct a Date object from the date and tee time given
    // we expect time to be in 24 hour time of the format HH:SS:MM
    if (!validDate(dateString)) {
      return null;
    }

    const timeString = formatTime(time);

    // all tee times come in as an Eastern time zone.  use moment-timezone
    // to parse the time appropriately regardless of the timezone of the
    // environment we're running in
    const etzMoment = moment.tz(timeString + ' ' + dateString, "HH:mm MM/DD/YYYY", 'America/New_York');

    // console.log(etzMoment.clone().tz('America/New_York').format('hh:mm z'));
    const teeTime = new Date(etzMoment.clone().format());
    return teeTime;
  };

  this.createPlayerData = function (players) {
    const results = [];

    for (var i = 0; i < players.length; i++) {
      const player = players[i];

      results.push(player.playerLabel);
    }

    return results;
  };

};

module.exports = TeeTimeSearch;