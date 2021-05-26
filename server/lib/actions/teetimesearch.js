var TimeSlots = require('../teetime/timeslots');
var TeeSheet = require('../pages/teesheet');
var Captcha = require('../pages/captcha');
var CaptchaImage = require('../pages/captchaimage');
var CreateTime = require('../teetime/createtime');
var fs = require('fs');

var TeeTimeSearch = function (path, session, captchaImagePath) {

  var getPath = function (date) {
    let thePath = path;

    thePath += '?calDate=' + date + '&course=-ALL-';

    return thePath;
  };

  var parseTeeTimes = function (body) {
    const teeSheet = new TeeSheet(body);
    const teetimes = teeSheet.getTeeTimes();

    // console.log("teetimes: " + JSON.stringify(teetimes));
    return teetimes;
  };

  /**
   * figure out captcha response and build captcha url to 
   * get to the tee sheet
   * 
   * @param {String} path the original search path
   * @param {Object} captcha the captcha page
   * @returns successful promise returns the tee sheet path with captcha response
   */
  var getCaptchaPath = function (path, captcha) {
    return new Promise(function (resolve, reject) {
      const imgPath = captcha.getImageUrl();
      if (imgPath === null) {
        reject('captcha image url not found!');
        return;
      }

      const captchaImage = new CaptchaImage(imgPath, session);

      console.log('found captcha image: ' + imgPath);

      captchaImage.getCaptchaNumber(captchaImagePath)
        .then((response) => {
          console.log('response: ' + response);

          const captchaPath = path + '&captchaResp=' + response;
          console.log('captcha path: ' + captchaPath);

          resolve(captchaPath);
        })
        .catch((e) => {
          console.log('error getting captcha number:');
          console.log('session result', session.getLastResponse());
          console.log('caught error:');
          console.log(e);

          reject(e);
        })
    });
  }

  /**
   * Look to see if the current page contents are a captcha
   * If so, process the captcha to get to the search page
   * If not, just return the search contents directly
   * 
   * @param {String} path the original search path
   * @param {String} body the contents of the search page
   * @returns successful promise returns the tee sheet contents
   */
  var processCaptcha = function (path, body) {
    return new Promise(function (resolve, reject) {
      // [05/25/2021 djb]
      // add a check for the @$*$ captcha system
      // body = fs.readFileSync('./examples/captcha.html');
      const captcha = new Captcha(body);

      if (captcha.isCaptcha()) {
        console.log('captcha page detected!');

        getCaptchaPath(path, captcha)
          .then((captchaPath) => {
            return session.get(captchaPath);
          })
          .then((body) => {
            resolve(body);
          })
          .catch((e) => {
            reject(e);
          });
      } else {
        console.log('no captcha page found, proceeding with tee sheet search');

        resolve(body);
      }
    });
  }

  /**
   * parse the tee times from the tee sheet, processing any captchas
   * along the way 
   */
  var getTeeSheet = function (path) {

    return new Promise(function (resolve, reject) {
      session.get(path)
        .then(function (body) {
          return processCaptcha(path, body);
        })
        .then((body) => {
          resolve(parseTeeTimes(body));
        })
        .catch((e) => {
          reject(e);
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