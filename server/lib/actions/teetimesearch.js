var moment = require('moment-timezone');

var TimeSlots = require('../teetime/timeslots');

var TeeTimeSearch = function (session) {

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

  var buildPath = function (date) {
    const month = date.getMonth() +1;
    const day = date.getDate();

    let path = 'api/v1/teetimes/GetAvailableTeeTimes/';

    path += date.getFullYear();
    path += (month < 10) ? '0' + month : month;
    path += (day < 10) ? '0' + day : day;

    path += '/118;119;120/0/null/false';

    return path;
  }

  var formatTime = function(timeString) {
    // tee times come in as HH:MM:SS
    // chop off the :SS
    const timeParts = timeString.split(':');

    if (timeParts.length != 3) {
      console.log("createTeeTime: invalid time format!")
      return null;
    }

    return timeParts[0] + ':' + timeParts[1]; 
  }

  var createTime = function (dateString, timeString) {
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
  }

  var create24HourTime = function (dateString, time) {
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
  }



  var createPlayerData = function (players) {
    const results = [];

    for (var i = 0; i < players.length; i++) {
      const player = players[i];

      results.push(player.playerLabel);
    }

    return results;
  }

  this.do = function (timeString, dateString, courses) {
    console.log("TeeTimeSearch.do");

    return new Promise(function (resolve, reject) {

      const date = createTime(dateString, timeString);

      if (date != null) {
        const path = buildPath(date);

        session.get(path)
          .then(function (body) {
              // build a list of time slots from this data              
              let slots = new TimeSlots();
              
              const json = JSON.parse(body);
              const teeSheet = json.data.teeSheet;

              for (var i = 0; i < teeSheet.length; i++) {
                const item = teeSheet[i];
                const key = item.teeSheetBank.teeSheetKey;

                const teeTime = create24HourTime(dateString, item.teeTime);
                if (teeTime == null) {
                  const err = "Could not create tee time from " + dateString + " " + item.teeTime;
                  console.log(err);
                  reject(err);
                  return;
                }
                const players = createPlayerData(item.players);

                if (!slots.add(teeTime, item.teeSheetTimeId, key.course, players)) {
                  console.log("error adding time slot " + JSON.stringify(item));
                }
              }

              slots = slots.filter(date, courses);

              resolve(slots);
            },
            function (err) {
              reject(err);
            });
      } else {
        reject("Invalid date string.  Should be MM/DD/YYYY format.");
      }

    });

  };

};

module.exports = TeeTimeSearch;