var moment = require('moment-timezone');

/**
 * Holds the time slot data from the tee sheet
 * 
 * @param {Date} teetime date object representing the tee time
 * @param {Object} json a set of JSON values returned from the tee sheet
 * @param {String} course the course for this time slot
 * @param {Array} players the players in this time slot
 */
var TimeSlot = function (teetime, json, course, players) {

  this.date = teetime;
  this.json = json;
  this.course = course;
  this.players = players.slice(0);

  this.isEmpty = function() {
    // true if time slot has no players, false otherwise
    for (var i=0; i<this.players.length; i++) {
      const player = this.players[i];

      if (player.toLowerCase() != "available") {
        return false;
      }
    }

    return true;
  }

  this.getCourse = function() {
    return this.course;
  }

  this.clone = function() {
    return new TimeSlot(this.date, this.json, this.course, this.players);
  }
  
  this.toString = function() {
    // convert to Eastern time for display
    const dtFormat= "YYYY-MM-DD hh:mm:ss a z";
    const dtString = moment(this.date).tz('America/New_York').format(dtFormat);

    return '{ date: ' + dtString + ', course: ' + this.course + '}';
  }
};

module.exports = TimeSlot;