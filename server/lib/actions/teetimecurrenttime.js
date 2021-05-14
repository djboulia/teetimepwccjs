
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
          const obj = JSON.parse(body);
          resolve(body);
        })
        .catch((e) => {
          reject(e);
        })

      });

  };
};

module.exports = TeeTimeCurrentTime;