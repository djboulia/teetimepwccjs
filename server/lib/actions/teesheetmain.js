var cheerio = require('cheerio');

var TeeSheetMain = function (session) {

  var teeSheetMain = function (path) {
    return new Promise(function (resolve, reject) {
      session.get(path)
        .then(function (body) {

          const ftKeys = {
            ftSSOKey: null,
            ftSSOIV: null,
            ftUserID: null,
            ftClubID: null
          }

          const $ = cheerio.load(body);
          //  console.log("teeSheetMain body: " + body);

          $('script').each(function (i, elem) {

            const temp = $(this).toString();
            // console.log(temp);

            const FTSSOKEY = "var ftSSOKey = '";
            const FTSSOIV = "var ftSSOIV = '";
            const FTUSERID = "var ftUserID = '";
            const FTCLUBID = "var ftClubID = '";

            if (temp.indexOf(FTSSOKEY) !== -1) {
              const start = temp.substr(temp.indexOf(FTSSOKEY) + FTSSOKEY.length);
              const end = start.indexOf("'");
              ftKeys.ftSSOKey = start.substr(0, end);
            }

            if (temp.indexOf(FTSSOIV) !== -1) {
              const start = temp.substr(temp.indexOf(FTSSOIV) + FTSSOIV.length);
              const end = start.indexOf("'");
              ftKeys.ftSSOIV = start.substr(0, end);
            }

            if (temp.indexOf(FTUSERID) !== -1) {
              const start = temp.substr(temp.indexOf(FTUSERID) + FTUSERID.length);
              const end = start.indexOf("'");
              ftKeys.ftUserID = start.substr(0, end);
            }

            if (temp.indexOf(FTCLUBID) !== -1) {
              const start = temp.substr(temp.indexOf(FTCLUBID) + FTCLUBID.length);
              const end = start.indexOf("'");
              ftKeys.ftClubID = start.substr(0, end);
            }
          });

          // console.log('ftKeys', ftKeys);
          resolve(ftKeys);

        }, function (err) {
          reject(err);
        });

    });
  }

  this.promise = function (path) {

    return new Promise(function (resolve, reject) {

      // load the main tee sheet
      teeSheetMain(path)
        .then(function (result) {
          resolve(result);
        })
    });
  };

};

module.exports = TeeSheetMain;