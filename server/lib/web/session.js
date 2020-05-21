// 
// hold Session level information as we interact with the given web site
// this will preserve cookies as we navigate through
// a web site
// 
// @site - top level web site for this session, e.g. prestonwood.com
//

var request = require('request');
var CookieJar = require('request-cookies').CookieJar;

var Session = function (site) {

  var cookies = new CookieJar();

  var getCookies = function (url) {
    var cookieString = cookies.getCookieHeaderString(url);

    return cookieString;
  };

  var setCookies = function (url, response) {
    // update cookie state
    var rawcookies = response.headers['set-cookie'];

    for (var i in rawcookies) {
      // console.log("Raw cookie: " + rawcookies[i]);

      cookies.add(rawcookies[i], url);
    }

    // var cookieString = getCookies(url)
    // console.log("cookieString after: " + cookieString);

  };

  var getUrl = function (path) {
    var delimiter = site.endsWith('/') ? "" : "/";

    return "https://" + site + delimiter + path;
  };

  var getPostJsonOptions = function(url, data) {
 
    // set cookie state
    var cookieString = getCookies(url);
    // console.log("cookieString before: " + cookieString);

    var options = {
      url: url,
      method: 'POST',
      headers: {
        'Cookie': cookieString
      },
      followRedirect: false,
      json: data
    };

    return options;
  };

  this.getCookieValue = function (key) {
    // look up a stored cookie by its key value

    var url = getUrl("");
    var cookieList = cookies.getCookies(url);

    var result = null;

    for (var i = 0; i < cookieList.length; i++) {
      var cookie = cookieList[i];
      var cookieObject = cookie.toJSON();

      // console.log(JSON.stringify(cookieObject));

      if (cookieObject.key == key) {
        result = cookieObject.value;
        break;
      }
    }

    // console.log("cookie value: " + result)
    return result;
  };

  this.get = function (path) {

    return new Promise(function (resolve, reject) {

      var url = getUrl(path);
      console.log("GET url " + url);

      // set cookie state
      var cookieString = getCookies(url);
      // console.log("cookieString before: " + cookieString);

      var options = {
        url: url,
        method: 'GET',
        headers: {
          Cookie: cookieString
        }
      };

      request(options, (error, response, body) => {
        // console.log("headers " + JSON.stringify(response.headers));

        if (!error) {
          setCookies(url, response);

          resolve(body);
        } else {
          console.log("Error!: " + error);
          reject(error);
        }
      });

    });
  };

  this.post = function (path, data) {

    return new Promise(function (resolve, reject) {

      var url = getUrl(path);
      console.log("POST url " + url);

      // set cookie state
      var cookieString = getCookies(url);
      // console.log("cookieString before: " + cookieString);

      var options = {
        url: url,
        method: 'POST',
        headers: {
          'Cookie': cookieString
        },
        followRedirect: false,
        form: data
      };

      request(options, (error, response, body) => {
        console.log("status code " + response.statusCode + " " + response.statusMessage);
        // console.log("headers " + JSON.stringify(response.headers));

        if (!error) {
          setCookies(url, response);

          resolve(body);
        } else {
          console.log("Error!: " + error);

          reject(error);
        }

      });

    });
  };

  this.postJson = function (path, data) {

    return new Promise(function (resolve, reject) {

      var url = getUrl(path);  
      var options = getPostJsonOptions(url, data);

      console.log("POST JSON url " + url);

      request(options, (error, response, body) => {
        console.log("status code " + response.statusCode + " " + response.statusMessage);
        // console.log("headers " + JSON.stringify(response.headers));

        if (!error) {
          setCookies(url, response);

          console.log(JSON.stringify(body));

          resolve(body);
        } else {
          console.log("Error!: " + error);

          reject(error);
        }

      });

    });
  };
  
};

module.exports = Session;