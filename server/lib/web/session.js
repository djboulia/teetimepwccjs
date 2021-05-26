// 
// hold Session level information as we interact with the given web site
// this will preserve cookies as we navigate through
// a web site
// 
// @site - top level web site for this session, e.g. prestonwood.com
//

var request = require('request');

// this is a great module for debugging what's actually going over the wire
// but enabling it will generate a ton of log data, so disable it when
// we're not debugging
//
// require('request-debug')(request);

var CookieJar = require('request-cookies').CookieJar;

var Session = function (site) {

  var defaultHeaders = {};
  var cookies = new CookieJar();
  var lastResponse = null;

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

  /**
   * sets any session cookie header for this url
   * 
   * @param {String} url request URL
   * @param {Object} allHeaders map of other headers for this request
   */
  var setCookieHeader = function (url, headers) {
    // set cookie state
    var cookieString = getCookies(url);

    if (headers['Cookie']) {
      console.log("Warning: Cookie header value " +
        headers['Cookie'] + " will be overwritten");
    }

    headers['Cookie'] = cookieString;
    // console.log("cookieString before: " + cookieString);
  };


  var buildUrl = function (protocol, path) {
    const base = protocol + "://" + site;

    let delimiter = '';
    if (!base.endsWith('/') && !path.startsWith('/')) {
      delimiter = '/';
    }

    return base + delimiter + path;
  };

  var getUrl = function (path) {
    console.log("Generating plain text HTTP URL");
    const protocol = "http";

    return buildUrl(protocol, path);
  };

  var getSecureUrl = function (path) {
    const protocol = "https";

    return buildUrl(protocol, path);
  };

  var clearLastResponse = function () {
    lastResponse = null;
  };

  var setLastResponse = function (response) {
    lastResponse = response;
  };

  /**
   * add the headers in source to the target
   * 
   * @param {Object} target where the headers will be added
   * @param {Object} source headers to add
   */
  var mixinHeaders = function (target, source) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
  }

  /**
   * set the headers for this request.  Headers can be set in three ways:
   * 1. any default session headers added via addHeader below.  these are
   *    added to all requests 
   * 2. any headers supplied for this request.  will override any similar 
   *    default headers supplied (just for this request)
   * 3. cookies.  these are maintained by the session and added automatically
   *    default and user headers can't override the Cookie header.
   * 
   * @param {String} url the URL for this request
   * @param {Object} headers any headers to add for this request
   */
  var getHeaders = function (url, headers) {
    // any user supplied headers will be here
    headers = (headers) ? headers : {};

    const allHeaders = {};

    // add default headers first... that way they
    // can be overridden by the request headers
    mixinHeaders(allHeaders, defaultHeaders);

    // now add custom headers for this call
    mixinHeaders(allHeaders, headers);

    setCookieHeader(url, allHeaders);

    // console.log("allHeaders: " + JSON.stringify(allHeaders));
    return allHeaders;
  };

  var getPostJsonOptions = function (url, data) {
    const headers = getHeaders(url);

    clearLastResponse();

    var options = {
      url: url,
      method: 'POST',
      headers: headers,
      followRedirect: false,
      json: data
    };

    return options;
  };

  /**
   * Internal handler for posting form data over HTTP or HTTPS
   * 
   * @param {String} url 
   * @param {Object} data 
   * @param {Object} headers (optional) additional request headers
   */
  var postUrl = function (url, data, headers) {

    return new Promise(function (resolve, reject) {

      const allHeaders = getHeaders(url, headers);

      clearLastResponse();

      var options = {
        url: url,
        method: 'POST',
        headers: allHeaders,
        followRedirect: false,
        form: data
      };

      request(options, (error, response, body) => {
        console.log("status code " + response.statusCode + " " + response.statusMessage);
        // console.log("headers " + JSON.stringify(response.headers));

        setLastResponse(response);

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


  ////////////////////////////////////////////////
  //    Externally visible methods start here   //
  ////////////////////////////////////////////////

  /**
   * add this header to the each request for this session.  
   * 
   * @param {Obj} hdr a key/value pair (or set of pairs) in the form <header>: <value>
   */
  this.addHeader = function (hdr) {
    mixinHeaders(defaultHeaders, hdr);
  };

  /**
   * this is the only externally visible method to 
   * see the response headers from the last http call
   */
  this.getLastResponse = function () {
    return lastResponse;
  };

  /**
   * look up a stored cookie by its path and key value
   */
  this.getCookieValue = function (path, key) {

    var url = getSecureUrl(path);
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

  /**
   * Make an HTTPS GET request to the path.  Cookies from the session are 
   * automatically added, but additional headers can be optionally specified
   * 
   * @param {String} path the path to issue the GET request from
   * @param {Object} headers optional additional headers to supply to this request
   */
  this.get = function (path, headers) {

    return new Promise(function (resolve, reject) {

      var url = getSecureUrl(path);
      console.log("GET url " + url);

      headers = getHeaders(url, headers);

      clearLastResponse();

      var options = {
        url: url,
        method: 'GET',
        headers
      };

      request(options, (error, response, body) => {
        // console.log("headers " + JSON.stringify(response.headers));

        setLastResponse(response);

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

  /**
   * Post form data over SSL
   * 
   * @param {String} path 
   * @param {Object} data form data
   * @param {Object} headers (optional) additional request headers
   */
  this.post = function (path, data, headers) {

    const url = getSecureUrl(path);
    console.log("POST url " + url);

    return postUrl(url, data, headers);
  };

  /**
   * By default all operations are done over SSL. There are still some instances
   * where the site needs plain HTTP, so we accommodate that here as 
   * an exception
   * 
   * @param {String} path 
   * @param {Object} data form data
   * @param {Object} headers (optional) additional request headers
   */
  this.postNoSSL = function (path, data, headers) {

    const url = getUrl(path);
    console.log("POST url " + url);

    return postUrl(url, data, headers);
  };

  /**
   * Post JSON data to the specified path
   * 
   * @param {String} path 
   * @param {Object} data JSON data
   */
  this.postJson = function (path, data) {

    return new Promise(function (resolve, reject) {

      var url = getSecureUrl(path);
      var options = getPostJsonOptions(url, data);

      console.log("POST JSON url " + url);

      request(options, (error, response, body) => {
        console.log("status code " + response.statusCode + " " + response.statusMessage);
        // console.log("headers " + JSON.stringify(response.headers));

        setLastResponse(response);

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