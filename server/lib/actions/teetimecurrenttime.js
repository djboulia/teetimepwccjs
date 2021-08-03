
var TeeTimeCurrentTime = function (path, session) {

  var getPath = function () {
    let thePath = path;

    thePath += '?club=prestonwoodccnc&new_skin=1&udbg=B267&cdbg=prestonwoodccnc&_=' + Date.now();

    return thePath;
  };

  this.promise = function () {

    console.log("currentTime");

    return new Promise(function (resolve, reject) {

      session.get(getPath())
        .then((body) => {
          const clock = JSON.parse(body);

          // adjust the clock to match the club time zone

          const offset = clock.server_tz_offset - clock.club_tz_offset;
          const adjust = offset * 1000 * 60 * 60;
          clock.ms = clock.ms + adjust;
          
          resolve(clock.ms);
        })
        .catch((e) => {
          reject(e);
        })

      });

  };
};

module.exports = TeeTimeCurrentTime;