var TimeSlot = function (teetime, id, course, players) {

  this.date = teetime;
  this.id = id;
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

  this.clone = function() {
    return new TimeSlot(this.date, this.id, this.course, this.players);
  }
};

module.exports = TimeSlot;