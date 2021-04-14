//
// handles authorization and access tokens for our app
//
// we handle this ourselves because the default authorization mechanism
// in loopback wants to handle user login and token generation
//
// since all of that is really on the back end of the tee time 
// system we're front-ending, we don't need another layer of access
//
var app = require('../../server');

/**
 * internal function for generating a token 
 * we use loopback's access token creator 
 */
var createTokenId = function (fn) {
  var AccessToken = app.models.AccessToken;

  AccessToken.createAccessTokenId(function (err, guid) {
    if (err) {
      console.log("SessionManager: error generated TokenId");
      fn(undefined);
    } else {
      fn(guid);
    }
  });
};

/**
 * extracts a token from a request object.  We use Loopback's AccessToken for this
 * 
 * @param {Request} req HTTP request object
 * @return {String} token or undefined if not found 
 */
var getTokenFromRequest = function (req) {
  var AccessToken = app.models.AccessToken;

  return AccessToken.getIdForRequest(req);
};



module.exports = function (ttl) { // time to live (in secs)

  var tokens = {};

  /**
   * extracts a token from a context object.  
   * 
   * @param {Context} ctx HTTP request object
   * @return {String} token or undefined if not found
   */
  this.getTokenFromContext = function (ctx) {
    const req = ctx && ctx.req;

    const token = getTokenFromRequest(req);

    // console.log("token " + token);
    return token ? token : undefined;
  };

  /**
   * creates a new token
   * 
   * @param {String} username the user we're creating this token for
   * @param {Function} fn will return the newly created token
   */
  this.create = function (username, fn) {
    createTokenId(function (token) {
      if (token) {
        var tokenData = {
          timestamp: Date.now(),
          username: username,
          data: undefined
        }

        tokens[token] = tokenData;
      }

      fn(token);
    });

  };

  this.isValid = function (token) {
    let result = false;
    const tokenData = tokens[token];

    if (tokenData) {
      if (Date.now() > tokenData.timestamp + (ttl * 1000)) {
        // expired token, remove this entry and return no data
        console.log("SessionManager: removing expired token " + token);
        tokens[token] = undefined;
      } else {
        result = true;
      }
    }

    return result;
  };

  /**
   * return an object representing the elements of this token
   * @param [String} token to search for
   * @return {Object} an object describing this token's characteristics or undefined
   */
  this.toObject = function(token) {
    let tokenObj = undefined;

    if (this.isValid(token)) {
      const tokenData = tokens[token];

      tokenObj = {
        id : token,
        ttl : ttl * 1000,  // return in millisecs
        created : new Date(tokenData.timestamp).toISOString(),
        userId : tokenData.username
      };
    }

    return tokenObj;
  };

  /**
   * retrieve the data stored at this token
   * @param [String} token to search for
   * @return {Object} data or undefined if token is expired/not found
   */
  this.get = function (token) {
    const tokenData = tokens[token];
    let data = undefined;

    if (this.isValid(token)) {
      data = tokenData.data;
    }

    return data;
  };

  /**
   * store the given object behind this token
   * subsequent calls to get() will return this data object
   * @param [String} token to set
   * @param [Object} data to store for this token
   * @return {Object} data or undefined if token is expired/not found
   */
  this.put = function (token, data) {

    const tokenData = tokens[token];

    if (tokenData) {
      tokenData.data = data;
    } else {
      console.log("Error: SessionManager.put - token not found!");
    }

    return tokenData != undefined;
  };

  /**
   * remove this token from the token manager
   * @param [String} token to remove
   */
  this.delete = function (token) {

    if (this.isValid(token)) {
      // remove this token from our chain
      tokens[token] = undefined;

      return true;
    } else {
      console.log("Error: SessionManager.delete - invalid token!");

      return false;
    }
  };

};