var TimeSlots = require('../teetime/timeslots');
var TeeSheet = require('../pages/teesheet');
var CreateTime = require('../teetime/createtime');

var TeeTimeSearch = function (path, session) {

  var getPath = function (date) {
    let thePath = path;

    thePath += '?calDate=' + date + '&course=-ALL-';

    return thePath;
  };

  /**
   * parse the tee times from the sheet 
   */
  var getTeeSheet = function (path) {

    return new Promise(function (resolve, reject) {
      session.get(path)
        .then(function (body) {

          const teeSheet = new TeeSheet(body);
          const teetimes = teeSheet.getTeeTimes();

          // console.log("teetimes: " + JSON.stringify(teetimes));

          resolve(teetimes);
        }, function (err) {
          reject(err);
        });
    });

  };

  this.promise = function (timeString, dateString, courses) {

    console.log("search time=" + timeString + ", date=" + dateString + ", courses=" + courses);

    return new Promise(function (resolve, reject) {

      const date = CreateTime(dateString, timeString);

      if (date != null) {
        const path = getPath(dateString);

        getTeeSheet(path)
          .then(function (teetimes) {
            
              // build a list of time slots from this data              
              let slots = new TimeSlots();

              for (var i = 0; i < teetimes.length; i++) {
                const item = teetimes[i];

                const teeTime = CreateTime(dateString, item.time);
                if (teeTime == null) {
                  const err = "Could not create tee time from " + dateString + " " + item.time;
                  console.log(err);
                  reject(err);
                  return;
                }
                const players = item.players;

                if (!slots.add(teeTime, item.json, item.course, players)) {
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