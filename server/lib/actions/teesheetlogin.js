var cheerio = require('cheerio');
var FormData = require('../web/formdata');

var TeeSheetLogin = function (session) {

  /**
   * there seems to be no API to get a member's name, so we
   * load the member sheet we get redirected to after login
   * so we can extract it from the page.
   * 
   * @param {String} path location of the member sheet
   * @returns promise and eventually the name of the member
   */
  var memberSheet = function (path) {

    return new Promise(function (resolve, reject) {

      session.get(path)
        .then(function (body) {

          let name = null;
          const $ = cheerio.load(body);

          $('span.memName').each(function (i, elem) {
            const temp = $(this).text();
            console.log('name: ', temp);
            name = temp;
          });

          //  console.log('memberSheet ' + body);
          resolve(name);

        });

    });
  };

  var loginTeeSheet = function (path, username, password, parameters) {

    return new Promise(function (resolve, reject) {

      // console.log("parameters: " + JSON.stringify(parameters));

      // load up our form data.  a bunch of these are fields from the
      // site login page that the server is expecting to see.  The 
      // relevant ones for us are the last three which hold the username/password
      var formdata = new FormData();
      formdata.add("UserLOGIN", parameters.UserLOGIN);
      formdata.add("UserPWD", parameters.UserPWD);
      formdata.add("btnLogon", parameters.btnLogon);
      formdata.add("Action", parameters.Action);
      formdata.add("DocID", parameters.DocID);
      formdata.add("LogonRequest", parameters.LogonRequest);
      formdata.add("R", parameters.R);

      // console.log("form data: " + formdata.toString());

      // this is the SSO handoff from the club site to the tee sheet site
      session.post(path, formdata.toObject())
        .then(function (body) {

          const response = session.getLastResponse();
          if (response.statusCode == 302) {
            const location = response.headers.location;
            console.log('location ' + location);

            // we don't get a lot of positive confirmation from
            // the results of the post, but if a successful login occurred, 
            // we should now have a cookie called JSESSIONID in our session
            const cookieVal = session.getCookieValue(path, 'FLEXID');
            console.log("Tee time system session id: " + cookieVal);

            const result = {
              'username': session.getCookieValue(path, 'UserLOGIN'),
              'uid': session.getCookieValue(path, 'UID'),
              'flexid': session.getCookieValue(path, 'FLEXID')
            }

            memberSheet(location)
              .then((name) => {
                result.name = name;

                resolve(result);
              })
              .catch((e) => {
                reject(e);
              })

          } else {

            if (response.statusCode == 200 && body.includes('Invalid username or password')) {
              console.log('invalid login credentials');
              reject('invalid login credentials');
            } else {
              console.log("status code: " + response.statusCode);
              // console.log(body);
              reject('Expected redirect after login, statusCode=' + response.statusCode);
            }
          }

        });

    });
  };

  var getLoginPage = function (path, username, password) {
    return new Promise(function (resolve, reject) {
      session.get(path)
        .then(function (body) {

          var parameters = {};
          parameters.UserLOGIN = username;
          parameters.UserPWD = password;
          parameters.btnLogon = "Login";
          parameters.Action = "Authenticate";
          parameters.DocID = "7";
          parameters.LogonRequest = "";
          parameters.R = "0";

          resolve(parameters);
        }, function (err) {
          reject(err);
        });

    });
  }

  this.promise = function (path, username, password) {

    return new Promise(function (resolve, reject) {

      getLoginPage(path, username, password)
        .then(function (parameters) {
          return loginTeeSheet(path, username, password, parameters)
        })
        .then(function (result) {
          resolve(result);
        })
        .catch((err) => {
          reject(err);
        });

    });
  };

};

module.exports = TeeSheetLogin;