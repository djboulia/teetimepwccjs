var cheerio = require('cheerio');
var FormData = require('../web/formdata');

var Login = function (session) {
  // handle login sequence for tee time site

  var getPage = function () {

    return new Promise(function (resolve, reject) {
      session.get('login.aspx')
        .then(function (body) {

          const $ = cheerio.load(body);
          // console.log("body: " + body);

          var parameters = {};
          parameters.viewState = $('input[id="__VIEWSTATE"]').val();
          parameters.viewStateGenerator = $('input[id="__VIEWSTATEGENERATOR"]').val();

          console.log("viewstate " + $('input[id="__VIEWSTATE"]').html());

          resolve(parameters);
        }, function (err) {
          reject(err);
        });

    });

  };

  var submitPage = function (parameters, username, password) {
    console.log("login.post username: " + username + " password: " + password);

    return new Promise(function (resolve, reject) {

      console.log("parameters: " + JSON.stringify(parameters));

      // load up our form data.  a bunch of these are fields from the
      // site login page that the server is expecting to see.  The 
      // relevant ones for us are the last three which hold the username/password
      var formdata = new FormData();

      formdata.add("manScript_HiddenField", "");
      formdata.add("__EVENTTARGET", "");
      formdata.add("__EVENTARGUMENT", "");
      formdata.add("__VIEWSTATE", parameters.viewState);
      formdata.add("lng", "en-US");
      formdata.add("DES_JSE", "1");
      formdata.add("__VIEWSTATEGENERATOR", parameters.viewStateGenerator);
      formdata.add("__SCROLLPOSITIONX", "0");
      formdata.add("__SCROLLPOSITIONY", "0");
      formdata.add("p$lt$ContentWidgets$pageplaceholder$p$lt$zoneContent$CHO_Widget_LoginFormWithFullscreenBackground_XLarge$loginCtrl$BaseLogin$UserName",
        username);
      formdata.add("p$lt$ContentWidgets$pageplaceholder$p$lt$zoneContent$CHO_Widget_LoginFormWithFullscreenBackground_XLarge$loginCtrl$BaseLogin$Password",
        password);
      formdata.add("p$lt$ContentWidgets$pageplaceholder$p$lt$zoneContent$CHO_Widget_LoginFormWithFullscreenBackground_XLarge$loginCtrl$BaseLogin$LoginButton",
        "Login");

      console.log("form data: " + formdata.toString());

      session.post('login.aspx', formdata.toObject())
        .then(function (body) {
          // we don't get a lot of positive confirmation from
          // the results of the post, but if a successful login occured, 
          // we should now have a coookie called .ASPXFORMSAUTH in our session
          var cookieVal = session.getCookieValue('.ASPXFORMSAUTH');

          resolve(cookieVal != null);
        }, function (err) {
          reject(err);
        });

    });
  };


  this.do = function (username, password) {
    console.log("login.do username: " + username + " password: " + password);

    return new Promise(function (resolve, reject) {

      getPage()
        .then(function (parameters) {
          return submitPage(parameters, username, password)
        })
        .then(function (result) {
          resolve(result);
        }, function (err) {
          reject(err);
        });

    });

  };

};

module.exports = Login;